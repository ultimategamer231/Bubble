import { render, screen } from '@testing-library/react-native';

import FocusShell from '../app/index';
import { fonts, lightColors } from '../src/design/tokens';

describe('Phase 0 shell', () => {
  it('shows the app title in Nunito on the brand background', async () => {
    await render(<FocusShell />);
    const title = screen.getByRole('header', { name: 'Focus Bubble' });
    expect(title).toHaveStyle({ fontFamily: fonts.displayBold, color: lightColors.text });
  });
});
