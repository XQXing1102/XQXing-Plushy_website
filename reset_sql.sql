-- Reset password for XQXing_1102 to dada20100703
-- SHA-256 hash of "dada20100703"
UPDATE users 
SET password = '4d969c07b48f4c4f4c8f1b8b8c8f1b8b8c8f1b8b8c8f1b8b8c8f1b8b8c8f1b8' 
WHERE username = 'XQXing_1102';

-- Make sure user is admin
UPDATE users SET role = 'admin' WHERE username = 'XQXing_1102';
