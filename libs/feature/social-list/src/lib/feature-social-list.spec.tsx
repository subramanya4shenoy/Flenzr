import { render } from '@testing-library/react';

import FeatureSocialList from './feature-social-list';

describe('FeatureSocialList', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureSocialList />);
    expect(baseElement).toBeTruthy();
  });
});
