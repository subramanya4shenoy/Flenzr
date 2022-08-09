import { render } from '@testing-library/react';

import FeatureProfileConnections from './feature-profile-connections';

describe('FeatureProfileConnections', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureProfileConnections />);
    expect(baseElement).toBeTruthy();
  });
});
