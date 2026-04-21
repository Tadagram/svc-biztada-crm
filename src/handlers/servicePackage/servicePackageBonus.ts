export type ServicePackageType = 'personal' | 'enterprise';

export function calcBonusLicenseCount(
  baseCount: number,
  bonusPercent: number,
  packageType: ServicePackageType,
): number {
  if (packageType !== 'enterprise' || bonusPercent <= 0 || baseCount <= 0) {
    return 0;
  }

  return Math.ceil((baseCount * bonusPercent) / 100);
}

export function formatBonusLicenseLabel(bonusCount: number): string | null {
  if (bonusCount <= 0) return null;
  return `+${new Intl.NumberFormat('en-US').format(bonusCount)}`;
}
