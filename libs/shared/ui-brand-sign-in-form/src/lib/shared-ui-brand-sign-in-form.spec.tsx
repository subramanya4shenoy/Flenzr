import { render } from '@testing-library/react';

import SharedUiBrandSignInForm from './shared-ui-brand-sign-in-form';

describe('SharedUiBrandSignInForm', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiBrandSignInForm />);
    expect(baseElement).toBeTruthy();
  });
});
