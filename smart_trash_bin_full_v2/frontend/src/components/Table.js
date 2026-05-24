
export default function Table({data}){
  return(
    <table border="1" width="100%">
      <thead>
        <tr>
          <th>Bin</th>
          <th>Type</th>
          <th>%</th>
          <th>Status</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d,i)=>(
          <tr key={i}>
            <td>{d.bin_id}</td>
            <td>{d.type}</td>
            <td>{d.percentage}</td>
            <td>{d.status}</td>
            <td>{d.created_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
