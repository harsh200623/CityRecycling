ALTER TABLE complaints
DROP CONSTRAINT IF EXISTS complaints_category_check;

ALTER TABLE complaints
ADD CONSTRAINT complaints_category_check CHECK (
  category IN (
    'Litter',
    'Overflowing Bin',
    'E-Waste',
    'Bio-Medical',
    'Construction Debris',
    'Dead Animal',
    'Illegal Dumping',
    'Hazardous',
    'Other'
  )
);
