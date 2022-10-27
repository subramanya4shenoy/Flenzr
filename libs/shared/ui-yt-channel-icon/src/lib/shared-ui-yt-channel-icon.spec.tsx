import { render } from '@testing-library/react';

import SharedUiYtChannelIcon from './shared-ui-yt-channel-icon';

describe('SharedUiYtChannelIcon', () => {
  it('should render successfully', () => {
    const { baseElement } = render(< SharedUiYtChannelIcon />);
    expect(baseElement).toBeTruthy();
  });
});
