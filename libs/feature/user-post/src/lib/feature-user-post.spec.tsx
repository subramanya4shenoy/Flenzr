import { render } from '@testing-library/react';

import FeatureUserPost from './feature-user-post';

describe('FeatureUserPost', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureUserPost />);
    expect(baseElement).toBeTruthy();
  });
});
