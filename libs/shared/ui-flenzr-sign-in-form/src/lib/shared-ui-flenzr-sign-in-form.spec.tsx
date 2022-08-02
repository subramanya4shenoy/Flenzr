import { render } from '@testing-library/react';

import SharedUiFlenzrSignInForm from './shared-ui-flenzr-sign-in-form';

describe('SharedUiFlenzrSignInForm', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiFlenzrSignInForm />);
    expect(baseElement).toBeTruthy();
  });
});
