import { render } from '@testing-library/react';

import FeatureProductPage from './feature-product-page';

describe('FeatureProductPage', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<FeatureProductPage />);
    expect(baseElement).toBeTruthy();
  });
});
