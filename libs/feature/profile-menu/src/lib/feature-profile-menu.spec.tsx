import { render } from '@testing-library/react';

import FeatureProfileMenu from './feature-profile-menu';

describe('FeatureProfileMenu', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureProfileMenu />);
    expect(baseElement).toBeTruthy();
  });
});
