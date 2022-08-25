import { render } from '@testing-library/react';

import FeaturePostReaction from './feature-post-reaction';

describe('FeaturePostReaction', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeaturePostReaction />);
    expect(baseElement).toBeTruthy();
  });
});
