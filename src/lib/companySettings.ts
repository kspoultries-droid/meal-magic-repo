import { z } from "zod";
const link = z.string().trim().max(500).refine(v => !v || /^https:\/\//.test(v), "Use an https link").refine(v => { try { return !v || new URL(v).protocol === "https:"; } catch { return false; } }, "Invalid link");
export const companySchema = z.object({
  helpline_phone: z.string().trim().max(20).refine(v => !v || /^\+?[0-9]{10,15}$/.test(v), "Valid phone required"),
  whatsapp_number: z.string().trim().max(20).refine(v => !v || /^\+?[0-9]{10,15}$/.test(v), "Valid WhatsApp number required"),
  contact_email: z.union([z.literal(""),z.string().trim().email().max(255)]),
  company_about: z.string().trim().max(10000), company_address: z.string().trim().max(500),
  company_careers: link, company_blog: link, social_facebook: link, social_instagram: link, social_x: link,
  legal_terms: z.string().trim().max(20000), legal_privacy: z.string().trim().max(20000), legal_cookies: z.string().trim().max(20000),
});
export const companyDefaults = { helpline_phone:"",whatsapp_number:"",contact_email:"",company_about:"",company_address:"",company_careers:"",company_blog:"",social_facebook:"",social_instagram:"",social_x:"",legal_terms:"",legal_privacy:"",legal_cookies:"" };
export function safeCompanyLink(value?: string) { try { return value && new URL(value).protocol === "https:" ? value : null; } catch { return null; } }