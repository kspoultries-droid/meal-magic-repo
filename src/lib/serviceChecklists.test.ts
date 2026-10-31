import { describe,it,expect } from 'vitest';
import {defaultServiceChecklist,checklistComplete,canReplaceService} from './serviceChecklists';
describe('Service supervision rules',()=>{
 it('requires every compulsory check before completion',()=>{const items=defaultServiceChecklist('Electrician');expect(checklistComplete(items,['scope'])).toBe(false);expect(checklistComplete(items,items.map(i=>i.id))).toBe(true);});
 it('keeps closed bookings unassignable',()=>{expect(canReplaceService('completed',false)).toBe(false);expect(canReplaceService('cancelled',false)).toBe(false);expect(canReplaceService('confirmed',false)).toBe(true);});
 it('requires finance review for paid advances',()=>{expect(canReplaceService('confirmed',true)).toBe(false);});
 it('preserves the car-wash station visit check',()=>{expect(defaultServiceChecklist('Car Services').map(i=>i.id)).toContain('station');});
 it('includes farm biosecurity in poultry labour',()=>{expect(defaultServiceChecklist('Poultry Control House Labour').map(i=>i.id)).toContain('biosecurity');});
});
