import { render } from '@testing-library/react';

import SharedUiFlenzrSignupForm from './shared-ui-flenzr-signup-form';

describe('SharedUiFlenzrSignupForm', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiFlenzrSignupForm />);
    expect(baseElement).toBeTruthy();
  });
});
