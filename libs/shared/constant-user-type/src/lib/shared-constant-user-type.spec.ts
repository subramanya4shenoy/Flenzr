import { ACCOUNT_TYPES, ACCOUNT_SETTINGS } from './shared-constant-user-type';

describe('Unit tests for Constant files', () => {
   it("Should return types of end users", () => {
    const acTypes  = ACCOUNT_TYPES;
    expect(acTypes.length).toBe(2);
   })

   it("Should return proper values for Flenzr", () => {
    const flenzr  = ACCOUNT_SETTINGS.Flenzr;
    expect(flenzr.title).toBe('Flenzr');
    expect(flenzr.id).toBe('Flenzr');
    expect(flenzr.desc).toBe('');
   })

   it("Should return proper values for Brand", () => {
    const brand  = ACCOUNT_SETTINGS.Brand;
    expect(brand.title).toBe('Brand');
    expect(brand.id).toBe('Brand');
    expect(brand.desc).toBe('');
   })
})