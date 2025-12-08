import { TrelloForm } from '@/components/trello-form';
import { FormNavbar } from '@/components/form-navbar';

export default function ImpressaoPage() {
    return (
        <main className="min-h-screen bg-[#0A192F] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center relative overflow-hidden pt-24">
            <FormNavbar />
            {/* Ambient Background Effects - Orange Tones for Impressão */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-900/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto w-full relative z-10">
                <div className="mb-12 text-center">
                    <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 via-gray-300 to-gray-400 bg-clip-text text-transparent mb-4">
                        Solicitação de Impressão
                    </h1>
                    <p className="text-xl text-orange-400/80 font-light tracking-wide">
                        Sistema de Solicitação Remota
                    </p>
                </div>
                <TrelloForm listType="impressao" />
            </div>
        </main>
    );
}
