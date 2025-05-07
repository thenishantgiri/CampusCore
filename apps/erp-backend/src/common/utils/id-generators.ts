export const generateRoleId = (name: string): string => {
  if (!name || name.trim() === '') {
    return 'role';
  }

  // Replace all non-alphanumeric characters with spaces
  const alphaNumOnly = name.replace(/[^a-zA-Z0-9\s]/g, '');

  // Convert to lowercase, trim spaces, replace spaces with hyphens
  let result = `role-${alphaNumOnly.trim().toLowerCase().replace(/\s+/g, '-')}`;

  // Replace multiple consecutive hyphens with a single hyphen
  result = result.replace(/-+/g, '-');

  return result;
};
