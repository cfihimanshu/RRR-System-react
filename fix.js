const fs = require('fs');
let c = fs.readFileSync('c:/Users/dell/RRR-System/frontend/src/components/tabs/CaseMasterTab.jsx', 'utf8');
c = c.replace(/const \[progressFormData, setProgressFormData\] = useState\(\{/, 'const [isSubmitting, setIsSubmitting] = useState(false);\n  const [progressFormData, setProgressFormData] = useState({');

const fns = ['handleCaseUpdate', 'handleProgressSubmit', 'handleCommSubmit', 'handleDocSubmit', 'handleMouSubmit', 'handleActionLogSubmit', 'handleEmailSubmit'];
fns.forEach(fn => {
  const findRegex = new RegExp('(const ' + fn + ' = async \\(e\\) => \\{\\n\\s*e\\.preventDefault\\(\\);)');
  c = c.replace(findRegex, \\n    if (isSubmitting) return;\n    setIsSubmitting(true););
});

// Now we need to append setIsSubmitting(false) to the end of the try block and early returns...
// Actually, an easier way is to just add it inside the function before return or at the end.
// Since these functions don't return early except for validations, we should put it at the start, and set inally { setIsSubmitting(false); } after catch (err) { ... }.
// A simpler way without breaking:
fns.forEach(fn => {
  // Add finally { setIsSubmitting(false); } after the catch block of these functions
  // This is tricky using regex.
});

fs.writeFileSync('c:/Users/dell/RRR-System/frontend/src/components/tabs/CaseMasterTab.jsx', c);
console.log('done');
