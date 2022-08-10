import { render } from '@testing-library/react';

import FeatureSocialAdd from './feature-social-add';

describe('FeatureSocialAdd', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureSocialAdd />);
    expect(baseElement).toBeTruthy();
  });
});
