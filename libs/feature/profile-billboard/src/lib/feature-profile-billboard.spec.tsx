import { render } from '@testing-library/react';

import FeatureProfileBillboard from './feature-profile-billboard';

describe('FeatureProfileBillboard', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureProfileBillboard />);
    expect(baseElement).toBeTruthy();
  });
});
