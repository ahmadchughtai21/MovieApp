export default function ErrorState({ message }) {
  return <div className="state error">{message || 'Something went wrong.'}</div>
}
