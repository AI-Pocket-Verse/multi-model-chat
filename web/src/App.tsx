import { ErrorBoundary } from './components/ErrorBoundary'
import { AiModelPage } from './pages/AiModelPage'

export function App() {
  return (
    <ErrorBoundary>
      <AiModelPage />
    </ErrorBoundary>
  )
}
