export interface DomainRow {
  name: string;
  grade: string;
  score: number;
  findingsCount: number;
}

export function DomainBreakdown({ domains }: { domains: DomainRow[] }) {
  return (
    <table style={{ marginTop: 24, borderCollapse: 'collapse', minWidth: 480 }}>
      <thead>
        <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
          <th>Dominio</th>
          <th>Nota</th>
          <th>Puntaje</th>
          <th>Hallazgos</th>
        </tr>
      </thead>
      <tbody>
        {domains.map((d) => (
          <tr key={d.name} style={{ borderTop: '1px solid var(--border)' }}>
            <td>{d.name}</td>
            <td>{d.grade}</td>
            <td>{d.score.toFixed(1)}</td>
            <td>{d.findingsCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
