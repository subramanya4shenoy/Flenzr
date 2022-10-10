import { render } from '@testing-library/react';

import FeatureSocialStepper from './feature-social-stepper';

describe('FeatureSocialStepper', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< FeatureSocialStepper />);
    expect(baseElement).toBeTruthy();
  });
});
