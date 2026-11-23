import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setTrLang } from "@/lib/i18n/tr";
import ProductQuickFill from "@/components/grocery/ProductQuickFill";
import BazarTargetPicker from "@/components/wholesale/BazarTargetPicker";
import AdProductPicker from "@/components/admin/AdProductPicker";

const { from, ilike, rows } = vi.hoisted(() => ({ from: vi.fn(), ilike: vi.fn(), rows: { current: [] as any[] } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
beforeEach(() => {
  setTrLang("en"); vi.clearAllMocks();
  rows.current = [{id:"sugar", name:"چینی", name_ur:"چینی", brand:"", unit:"kg", image_url:null,grocery_stores:{name:"Shop"}}];
  from.mockImplementation(() => {
    const query: any = { then: (resolve: any) => Promise.resolve({data:rows.current,error:null}).then(resolve) };
    for (const method of ["select","eq","order","limit","range"]) query[method] = vi.fn(() => query);
    // Emulate the original substring gate, so adding it back breaks regressions.
    query.ilike = ilike.mockImplementation((_column, pattern) => {rows.current=rows.current.filter(row=>row.name.includes(pattern.replace(/%/g,"")));return query;});
    query.or = vi.fn(() => { rows.current=[];return query; });
    return query;
  });
});
afterEach(cleanup);
describe("name-search candidate preservation", () => {
  it("quick catalog lookup finds cheeni in an Urdu-only product",async()=>{
    render(<ProductQuickFill categories={["General"]} onFill={vi.fn()}/>);
    fireEvent.change(screen.getByRole("textbox",{name:"Catalog name search"}),{target:{value:"cheeni"}});
    const searchButtons=screen.getAllByRole("button",{name:"Search"});
    const searchButton=searchButtons[0];
    if (!searchButton) throw new Error("Missing catalog search");
    fireEvent.click(searchButton);
    await screen.findByRole("button",{name:"چینی · kg"});
    expect(ilike).not.toHaveBeenCalled();
  });
  it("Bazar product selection finds suger and returns the original product",async()=>{
    rows.current[0].name="Sugar";const pick=vi.fn();
    render(<BazarTargetPicker mode="product" onPick={pick}/>);
    fireEvent.change(screen.getByRole("textbox",{name:"Search selection"}),{target:{value:"suger"}});
    fireEvent.click(await screen.findByRole("button",{name:"Sugar Shop"}));
    expect(pick).toHaveBeenCalledWith(expect.objectContaining({name:"Sugar",link:"/product/sugar"}));
  });
  it("Bazar shop selection preserves cross-script matching",async()=>{
    rows.current[0].name="شاہین";
    render(<BazarTargetPicker mode="store" onPick={vi.fn()}/>);
    fireEvent.change(screen.getByRole("textbox",{name:"Search selection"}),{target:{value:"shaheen"}});
    await screen.findByRole("button",{name:"شاہین"});
    expect(ilike).not.toHaveBeenCalled();
  });
  it("ad item picker filters before paginating fuzzy results",async()=>{
    const pick=vi.fn();render(<AdProductPicker onPick={pick}/>);
    fireEvent.click(screen.getByRole("button",{name:"Services"}));
    rows.current=[...Array.from({length:20},(_,i)=>({id:`other-${i}`,name:"Milk"})),{id:"sugar",name:"Sugar",price:160,image_url:null}];
    fireEvent.change(screen.getByRole("textbox",{name:"Search business or item"}),{target:{value:"suger"}});
    fireEvent.click(await screen.findByRole("button",{name:"Sugar Rs 160"}));
    await waitFor(()=>expect(pick).toHaveBeenCalledWith(expect.objectContaining({id:"sugar",price:160}),true));
  });
});