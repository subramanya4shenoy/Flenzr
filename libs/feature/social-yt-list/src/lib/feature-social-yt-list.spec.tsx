import { render } from '@testing-library/react';

import FeatureSocialYtList from './feature-social-yt-list';

describe('FeatureSocialYtList', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureSocialYtList />);
    expect(baseElement).toBeTruthy();
  });
});
