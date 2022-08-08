import { render } from '@testing-library/react';

import SharedUiThirdPartySignin from './shared-ui-third-party-signin';

describe('SharedUiThirdPartySignin', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiThirdPartySignin />);
    expect(baseElement).toBeTruthy();
  });
});
