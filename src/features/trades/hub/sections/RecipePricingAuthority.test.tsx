import { fireEvent, render } from '@testing-library/react-native';

import { RecipePricingAuthority } from './RecipePricingAuthority';

describe('recipe pricing authority notice', () => {
  it('states PRICE NEEDED and routes directly to Catalogue without generic fallback copy', async () => {
    const onOpenCatalogue = jest.fn();
    const screen = await render(
      <RecipePricingAuthority count={2} detectionFailed={false} onOpenCatalogue={onOpenCatalogue} />,
    );
    expect(screen.getByText(/PRICE NEEDED/i)).toBeTruthy();
    expect(screen.getByText(/inspection/i)).toBeTruthy();
    expect(screen.queryByText(/generic price/i)).toBeNull();
    await fireEvent.press(screen.getByText('OPEN CATALOGUE'));
    expect(onOpenCatalogue).toHaveBeenCalledTimes(1);
  });
});
