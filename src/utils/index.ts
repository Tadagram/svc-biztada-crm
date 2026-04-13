export function mappingPrefixPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.startsWith('+84')) {
    return `0${phoneNumber.slice(3)}`;
  }

  return phoneNumber;
}
