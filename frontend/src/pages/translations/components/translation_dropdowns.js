import React from 'react';
import Select from 'react-select';

// Reusable dropdowns for Translation pages
// Props:
// - selectedTables: string[]
// - selectedFields: string[]
// - filteredTableOptions: string[]
// - filteredFieldOptions: string[]
// - fieldRuleCounts: Record<string, number>
// - rulesLength: number (used to refresh field key when rules change)
// - onTablesChange: (tables: string[]) => void
// - onFieldsChange: (fields: string[]) => void
// - onClearFilters: () => void
export default function TranslationDropdowns({
  selectedTables,
  selectedFields,
  filteredTableOptions,
  filteredFieldOptions,
  fieldRuleCounts,
  rulesLength, // kept for API compatibility, not used after removing key
  onTablesChange,
  onFieldsChange,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Table multi-select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Select
            placeholder={<div>Select table(s)...</div>}
            isMulti
            onChange={(options) => {
              const vals = (options || []).map(o => o.value);
              onTablesChange(vals);
            }}
            value={(selectedTables || []).map(t => ({ value: t, label: t }))}
            options={(filteredTableOptions || []).map(tbl => ({ value: tbl, label: tbl }))}
            getOptionValue={(opt) => opt.value}
            closeMenuOnSelect={false}
            styles={{
              control: (base) => ({
                ...base,
                minWidth: 220,
                border: '1px solid #ccc',
                borderRadius: 4,
                padding: '6px 10px',
              }),
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              menu: (base) => ({ ...base, zIndex: 9999 })
            }}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
        </div>

        {/* Field multi-select */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Select
            placeholder={(selectedTables && selectedTables.length > 0) ? `Select field(s)...` : 'Select field(s)...'}
            isMulti
            options={(filteredFieldOptions || []).map(fld => ({ value: fld }))}
            getOptionValue={(opt) => opt.value}
            getOptionLabel={(opt) => `${opt.value}${fieldRuleCounts && fieldRuleCounts[opt.value] ? ` (${fieldRuleCounts[opt.value]})` : ''}`}
            styles={{
              control: (base) => ({ ...base, minWidth: 220, border: '1px solid #ccc', borderRadius: 4, padding: '6px 10px' }),
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              menu: (base) => ({ ...base, zIndex: 9999 })
            }}
            onChange={(options) => onFieldsChange((options || []).map(o => o.value))}
            value={(selectedFields || []).map(f => ({ value: f }))}
            closeMenuOnSelect={false}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
        </div>
      </div>
    </div>
  );
}