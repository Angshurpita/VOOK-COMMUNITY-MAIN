import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import Background3D from "@/components/Background3D";

const AuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                const url = new URL(window.location.href);
                const code = url.searchParams.get('code');

                if (code) {
                    // PKCE flow: exchange the code for a session
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        console.error('Auth code exchange error:', error);
                        navigate('/login?error=authentication_failed');
                        return;
                    }
                    if (data.session) {
                        console.log('Auth successful via code exchange');
                        navigate('/');
                        return;
                    }
                }

                // Fallback: check existing session (for implicit flow or if code exchange already happened)
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth callback error:', error);
                    navigate('/login?error=authentication_failed');
                    return;
                }

                if (data.session) {
                    console.log('Auth successful, redirecting to home');
                    navigate('/');
                } else {
                    // Wait for auth state change with a timeout
                    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                        if (event === 'SIGNED_IN' && session) {
                            console.log('Auth state change: SIGNED_IN');
                            navigate('/');
                        } else if (event === 'SIGNED_OUT') {
                            console.log('Auth state change: SIGNED_OUT');
                            navigate('/login');
                        }
                    });

                    // Safety timeout — don't leave user on spinner forever
                    setTimeout(() => {
                        subscription.unsubscribe();
                        console.warn('Auth callback timed out, redirecting to login');
                        navigate('/login?error=callback_timeout');
                    }, 10000);

                    return () => subscription.unsubscribe();
                }
            } catch (error) {
                console.error('Auth callback error:', error);
                navigate('/login?error=callback_failed');
            }
        };

        handleAuthCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden">
            <Background3D />
            <div className="flex flex-col items-center justify-center space-y-4 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-white/70 text-sm">Completing authentication...</p>
            </div>
        </div>
    );
};

export default AuthCallback;
