export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative">
        {/* Spinner principal */}
        <div className="animate-spin rounded-full h-32 w-32 border-4 border-gray-700 border-t-blue-500 border-r-purple-500 border-b-pink-500 border-l-indigo-500"></div>
        
        {/* Spinner secundário */}
        <div className="absolute inset-0 animate-spin rounded-full h-32 w-32 border-4 border-transparent border-t-blue-400 border-r-purple-400 border-b-pink-400 border-l-indigo-400 animate-pulse" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
        
        {/* Círculo central */}
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 animate-pulse"></div>
      </div>
      
      {/* Texto de carregamento */}
      <div className="text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Carregando Dashboard
        </h2>
        <p className="text-gray-400">Preparando dados e visualizações...</p>
      </div>
      
      {/* Pontos animados */}
      <div className="flex gap-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  )
}
