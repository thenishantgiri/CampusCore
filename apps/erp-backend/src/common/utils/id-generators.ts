export const generateRoleId = (name: string): string => {
  return `role-${name.toLowerCase().replace(/\s+/g, '-')}`;
};
