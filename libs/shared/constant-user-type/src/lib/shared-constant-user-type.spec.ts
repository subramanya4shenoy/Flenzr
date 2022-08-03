import { sharedConstantUserType } from './shared-constant-user-type';

describe('sharedConstantUserType', () => {
    it('should work', () => {
        expect(sharedConstantUserType()).toEqual('shared-constant-user-type');
    })
})