import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "https://esm.sh/@simplewebauthn/server@13.1.1";
import { isoBase64URL } from "https://esm.sh/@simplewebauthn/server@13.1.1/helpers";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// In-memory challenge store (short-lived)
const challengeStore = new Map<string, { challenge: string; expires: number }>();

function storeChallenge(key: string, challenge: string) {
  challengeStore.set(key, { challenge, expires: Date.now() + 5 * 60 * 1000 });
}

function getChallenge(key: string): string | null {
  const entry = challengeStore.get(key);
  if (!entry || entry.expires < Date.now()) {
    challengeStore.delete(key);
    return null;
  }
  challengeStore.delete(key);
  return entry.challenge;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();
    const origin = req.headers.get("origin") || "https://meal-magic-repo.lovable.app";
    const rpID = new URL(origin).hostname;
    const rpName = "MealMagic";

    if (action === "register-options") {
      // User must be authenticated
      const authHeader = req.headers.get("authorization");
      if (!authHeader) throw new Error("Not authenticated");
      
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (error || !user) throw new Error("Invalid token");

      // Get existing credentials
      const { data: existing } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("credential_id")
        .eq("user_id", user.id);

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: isoBase64URL.fromUTF8String(user.id),
        userName: user.email || user.id,
        userDisplayName: user.user_metadata?.full_name || user.email || "User",
        attestationType: "none",
        excludeCredentials: (existing || []).map((c) => ({
          id: c.credential_id,
          type: "public-key",
        })),
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
      });

      storeChallenge(`reg_${user.id}`, options.challenge);

      return new Response(JSON.stringify(options), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "register-verify") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) throw new Error("Not authenticated");
      
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
      if (error || !user) throw new Error("Invalid token");

      const expectedChallenge = getChallenge(`reg_${user.id}`);
      if (!expectedChallenge) throw new Error("Challenge expired");

      const verification = await verifyRegistrationResponse({
        response: body.credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error("Verification failed");
      }

      const { credential } = verification.registrationInfo;

      await supabaseAdmin.from("webauthn_credentials").insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: isoBase64URL.fromBuffer(credential.publicKey),
        counter: Number(credential.counter),
        device_name: body.deviceName || "Fingerprint",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "auth-options") {
      const email = body.email;
      
      // Find user by email
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.find(u => u.email === email);
      if (!user) throw new Error("User not found");

      const { data: creds } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("credential_id")
        .eq("user_id", user.id);

      if (!creds?.length) throw new Error("No biometric registered");

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: creds.map((c) => ({
          id: c.credential_id,
          type: "public-key",
        })),
        userVerification: "required",
      });

      storeChallenge(`auth_${user.id}`, options.challenge);

      return new Response(JSON.stringify({ ...options, userId: user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "auth-verify") {
      const { credential, userId } = body;

      const expectedChallenge = getChallenge(`auth_${userId}`);
      if (!expectedChallenge) throw new Error("Challenge expired");

      // Get stored credential
      const { data: storedCred } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("*")
        .eq("credential_id", credential.id)
        .eq("user_id", userId)
        .single();

      if (!storedCred) throw new Error("Credential not found");

      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: storedCred.credential_id,
          publicKey: isoBase64URL.toBuffer(storedCred.public_key),
          counter: Number(storedCred.counter),
        },
      });

      if (!verification.verified) throw new Error("Verification failed");

      // Update counter
      await supabaseAdmin
        .from("webauthn_credentials")
        .update({ counter: Number(verification.authenticationInfo.newCounter) })
        .eq("id", storedCred.id);

      // Generate magic link for the user
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!userData?.user?.email) throw new Error("User email not found");

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

      if (linkError) throw linkError;

      // Extract token from the link
      const tokenHash = linkData?.properties?.hashed_token;
      
      return new Response(JSON.stringify({ 
        success: true, 
        token_hash: tokenHash,
        email: userData.user.email,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
