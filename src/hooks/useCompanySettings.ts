import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { companyDefaults } from "@/lib/companySettings";
export function useCompanySettings() {
  return useQuery({queryKey:["company-settings"],queryFn:async()=>{
    const {data,error}=await supabase.from("app_settings").select("key,value").in("key",Object.keys(companyDefaults));
    if(error)throw error;
    return {...companyDefaults,...Object.fromEntries((data||[]).map(r=>[r.key,r.value]))} as typeof companyDefaults;
  }});
}