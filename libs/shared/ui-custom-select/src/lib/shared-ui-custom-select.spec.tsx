import { render } from '@testing-library/react';

import SharedUiCustomSelect from './shared-ui-custom-select';

describe('SharedUiCustomSelect', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<SharedUiCustomSelect />);
    expect(baseElement).toBeTruthy();
  });
});
