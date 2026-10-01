import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "https://esm.sh/@simplewebauthn/server@13.1.1";
import { isoBase64URL, isoUint8Array } from "https://esm.sh/@simplewebauthn/server@13.1.1/helpers";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Challenges DB me rakhe jate hain (function ki har request alag server par chal sakti hai)
async function storeChallenge(kind: string, challenge: string, userId?: string) {
  await supabaseAdmin.from("webauthn_challenges").delete().lt("expires_at", new Date().toISOString());
  await supabaseAdmin.from("webauthn_challenges").insert({ challenge, kind, user_id: userId ?? null });
}

// Browser ke jawab (clientDataJSON) se challenge nikal kar DB me check + ek dafa istemal
async function getChallenge(kind: string, credential: any, userId?: string): Promise<string | null> {
  try {
    const raw = credential?.response?.clientDataJSON;
    const c = JSON.parse(new TextDecoder().decode(isoBase64URL.toBuffer(raw))).challenge as string;
    let q = supabaseAdmin.from("webauthn_challenges").delete().eq("challenge", c).eq("kind", kind)
      .gt("expires_at", new Date().toISOString());
    if (userId) q = q.eq("user_id", userId);
    const { data } = await q.select("challenge");
    return data?.[0]?.challenge ?? null;
  } catch { return null; }
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
        userID: new TextEncoder().encode(user.id),
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
          residentKey: "required",
          requireResidentKey: true,
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
      // No email needed — discoverable credentials (passkeys) handle user selection
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "required",
        // Empty allowCredentials = browser shows all registered passkeys for this RP
      });

      // Store challenge with a generic key (we'll match by credential ID later)
      storeChallenge(`auth_discoverable`, options.challenge);

      return new Response(JSON.stringify(options), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "auth-verify") {
      const { credential } = body;

      const expectedChallenge = getChallenge(`auth_discoverable`);
      if (!expectedChallenge) throw new Error("Challenge expired");

      // Find stored credential by credential_id (no userId needed)
      const { data: storedCred } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("*")
        .eq("credential_id", credential.id)
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
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(storedCred.user_id);
      if (!userData?.user?.email) throw new Error("User email not found");

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

      if (linkError) throw linkError;

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
