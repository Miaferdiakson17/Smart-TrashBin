
export default function Card({data}){
  return(
    <div style={{margin:10,padding:20,background:"#ddd"}}>
      <h3>{data.type}</h3>
      <h2>{data.percentage}%</h2>
      <p>{data.status}</p>
    </div>
  )
}
