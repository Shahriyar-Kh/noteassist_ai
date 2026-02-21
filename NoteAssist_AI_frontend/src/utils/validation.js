// Small client-side validators used to give quick feedback and prevent obvious bad requests
export const isEmail = (value) => {
  if (!value || typeof value !== 'string') return false;
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
  return re.test(value.trim());
};

export const isStrongPassword = (value) => {
  if (!value || typeof value !== 'string') return false;
  // At least 8 chars, one number, one letter
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-={}\[\]:";'<>?,./]{8,}$/.test(value);
};

export const sanitizeString = (s) => (s && typeof s === 'string' ? s.trim() : s);

export default { isEmail, isStrongPassword, sanitizeString };
