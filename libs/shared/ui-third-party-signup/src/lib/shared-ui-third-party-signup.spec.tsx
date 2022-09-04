import { render } from '@testing-library/react';

import SharedUiThirdPartySignup from './shared-ui-third-party-signup';

describe('SharedUiThirdPartySignup', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiThirdPartySignup />);
    expect(baseElement).toBeTruthy();
  });
});
