import { render } from '@testing-library/react';

import SharedUiUserCard from './shared-ui-user-card';

describe('SharedUiUserCard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiUserCard />);
    expect(baseElement).toBeTruthy();
  });
});
