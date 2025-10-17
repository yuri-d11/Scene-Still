function parseCSV(text) {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());

    return lines.slice(1).map(line => {
        const rawValues = line.split(',');
        return headers.reduce((obj, header, index) => {
            const value = rawValues[index];
            obj[header] = String(value || '').trim();
            return obj;
        }, {});
    });
}