import { expect, it } from "vitest";
import { companyDefaults,companySchema,safeCompanyLink } from "./companySettings";
it("only publishes safe configured company links",()=>{
 expect(safeCompanyLink("javascript:alert(1)")).toBeNull();
 expect(safeCompanyLink("#")).toBeNull();
 expect(safeCompanyLink("https://example.com/company")).toBe("https://example.com/company");
 expect(companySchema.safeParse({...companyDefaults,social_facebook:"javascript:alert(1)"}).success).toBe(false);
});