import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../../shared/widgets/whatsapp_floating_button.dart';
import '../../navbar/welcome_navbar.dart';
import '../../../../auth/login_screen.dart';
import '../welcome_screen.dart';
import 'company_screen.dart';
import 'servicios_screen.dart';
import 'acerca_de_screen.dart';
import 'destinations_screen.dart';
import 'contacts_screen.dart';
import 'tours_screen.dart';
import 'weddings_screen.dart';

// Constants
const _kPrimaryColor = Color(0xFF1D4ED8);
const _kTextColor = Color(0xFF1A202C);
const _kSpacing = 16.0;
const _kBorderRadius = 12.0;

/// Pantalla de Términos y Condiciones
class TermsScreen extends StatefulWidget {
  const TermsScreen({super.key});

  @override
  State<TermsScreen> createState() => _TermsScreenState();
}

class _TermsScreenState extends State<TermsScreen> {
  User? _currentUser;
  StreamSubscription<User?>? _authSubscription;

  @override
  void initState() {
    super.initState();
    bool firebaseInitialized = false;
    try {
      firebaseInitialized = Firebase.apps.isNotEmpty;
    } catch (e) {
      firebaseInitialized = false;
    }

    if (!firebaseInitialized) {
      _currentUser = null;
      return;
    }

    try {
      _currentUser = FirebaseAuth.instance.currentUser;
      _authSubscription = FirebaseAuth.instance.authStateChanges().listen((User? user) {
        if (mounted) {
          setState(() => _currentUser = user);
        }
      });
    } catch (e) {
      _currentUser = null;
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  void _navigateToLogin() {
    Navigator.of(context).push(MaterialPageRoute(builder: (context) => const LoginScreen()));
  }

  void _navigateToProfile() {
    final l10n = AppLocalizations.of(context);
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(l10n?.profileComingSoon ?? 'Mi perfil (próximamente)')));
  }

  Future<void> _handleLogout() async {
    if (!mounted) return;
    try {
      await FirebaseAuth.instance.signOut();
      await Future.delayed(const Duration(milliseconds: 500));
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const WelcomeScreen()),
          (route) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        final l10n = AppLocalizations.of(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${l10n?.logoutError ?? 'Error al cerrar sesión'}: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _navigateToWelcomePath() {
    if (!mounted) return;
    Navigator.of(
      context,
    ).pushReplacement(MaterialPageRoute(builder: (context) => const WelcomeScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: WelcomeNavbar(
        currentUser: _currentUser,
        onNavigateToLogin: _navigateToLogin,
        onNavigateToProfile: _navigateToProfile,
        onHandleLogout: _handleLogout,
        onNavigateToWelcomePath: _navigateToWelcomePath,
        onNavigateToCompany: () {
          Navigator.of(
            context,
          ).pushReplacement(MaterialPageRoute(builder: (context) => const CompanyScreen()));
        },
        onNavigateToServices: () {
          Navigator.of(
            context,
          ).pushReplacement(MaterialPageRoute(builder: (context) => const ServiciosScreen()));
        },
        onNavigateToAbout: () {
          Navigator.of(
            context,
          ).pushReplacement(MaterialPageRoute(builder: (context) => const AcercaDeScreen()));
        },
        onNavigateToDestination: () {
          Navigator.of(
            context,
          ).pushReplacement(MaterialPageRoute(builder: (context) => const DestinationsScreen()));
        },
        onNavigateToContacts: () {
          Navigator.of(
            context,
          ).pushReplacement(MaterialPageRoute(builder: (context) => const ContactsScreen()));
        },
        onNavigateToTours: () {
          Navigator.of(
            context,
          ).pushReplacement(MaterialPageRoute(builder: (context) => const ToursScreen()));
        },
        onNavigateToWeddings: () {
          Navigator.of(
            context,
          ).pushReplacement(MaterialPageRoute(builder: (context) => const WeddingsScreen()));
        },
        onNavigateToTerms: null, // Ya estamos en esta pantalla
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeader(context),
            const SizedBox(height: _kSpacing * 3),
            _buildContent(context),
            const SizedBox(height: _kSpacing * 4),
          ],
        ),
      ),
      floatingActionButton: Builder(
        builder: (context) {
          final l10n = AppLocalizations.of(context);
          return WhatsAppFloatingButton(
            prefilledMessage:
                l10n?.whatsappMessageWelcome ?? 'Hola, tengo una consulta sobre los términos',
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: _kSpacing * 5, horizontal: _kSpacing * 3),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300, width: 1)),
      ),
      child: Column(
        children: [
          Icon(Icons.description, size: 60, color: _kPrimaryColor),
          const SizedBox(height: _kSpacing * 2),
          Text(
            l10n?.termsTitle ?? 'Términos y Condiciones',
            style: GoogleFonts.exo(
              fontSize: 42,
              fontWeight: FontWeight.bold,
              color: _kTextColor,
              letterSpacing: -1,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: _kSpacing),
          Text(
            l10n?.termsLastUpdate ?? 'Última actualización: Diciembre 2024',
            style: GoogleFonts.exo(fontSize: 14, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Container(
      constraints: const BoxConstraints(maxWidth: 900),
      padding: const EdgeInsets.symmetric(horizontal: _kSpacing * 3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSection(
            '1. ${l10n?.termsSection1Title ?? 'Aceptación de los Términos'}',
            l10n?.termsSection1Content ??
                'Al utilizar nuestros servicios de transporte, usted acepta estar sujeto a estos términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios.',
          ),
          const SizedBox(height: _kSpacing * 3),
          _buildSection(
            '2. ${l10n?.termsSection2Title ?? 'Servicios Ofrecidos'}',
            l10n?.termsSection2Content ??
                'Ofrecemos servicios de transporte privado, incluyendo traslados al aeropuerto, tours turísticos, servicios para eventos especiales y transporte corporativo. Todos nuestros servicios están sujetos a disponibilidad.',
          ),
          const SizedBox(height: _kSpacing * 3),
          _buildSection(
            '3. ${l10n?.termsSection3Title ?? 'Reservas y Pagos'}',
            l10n?.termsSection3Content ??
                'Las reservas pueden realizarse a través de nuestra plataforma web. El pago debe completarse al momento de la reserva mediante los métodos de pago aceptados (tarjeta de crédito, PayPal, Apple Pay, Google Pay). Todas las tarifas incluyen IVA.',
          ),
          const SizedBox(height: _kSpacing * 3),
          _buildSection(
            '4. ${l10n?.termsSection4Title ?? 'Cancelaciones y Reembolsos'}',
            l10n?.termsSection4Content ??
                'Las cancelaciones realizadas con más de 24 horas de anticipación tendrán un reembolso completo. Cancelaciones con menos de 24 horas tendrán un cargo del 50%. No se realizarán reembolsos por cancelaciones el mismo día del servicio.',
          ),
          const SizedBox(height: _kSpacing * 3),
          _buildSection(
            '5. ${l10n?.termsSection5Title ?? 'Responsabilidades del Cliente'}',
            l10n?.termsSection5Content ??
                'El cliente debe proporcionar información precisa sobre la ubicación de recogida y destino. Debe estar listo en el punto de recogida a la hora acordada. El cliente es responsable de sus pertenencias personales durante el viaje.',
          ),
          const SizedBox(height: _kSpacing * 3),
          _buildSection(
            '6. ${l10n?.termsSection6Title ?? 'Limitación de Responsabilidad'}',
            l10n?.termsSection6Content ??
                'Nuestra responsabilidad se limita al servicio de transporte contratado. No somos responsables por retrasos causados por tráfico, condiciones climáticas adversas o circunstancias fuera de nuestro control.',
          ),
          const SizedBox(height: _kSpacing * 3),
          _buildSection(
            '7. ${l10n?.termsSection7Title ?? 'Protección de Datos'}',
            l10n?.termsSection7Content ??
                'Tratamos sus datos personales de acuerdo con el RGPD y nuestra Política de Privacidad. Sus datos solo se utilizan para proporcionar y mejorar nuestros servicios.',
          ),
          const SizedBox(height: _kSpacing * 3),
          _buildSection(
            '8. ${l10n?.termsSection8Title ?? 'Modificaciones'}',
            l10n?.termsSection8Content ??
                'Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en nuestra plataforma.',
          ),
          const SizedBox(height: _kSpacing * 4),
          _buildContactBox(context),
        ],
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: GoogleFonts.exo(fontSize: 22, fontWeight: FontWeight.bold, color: _kTextColor),
        ),
        const SizedBox(height: _kSpacing),
        Text(
          content,
          style: GoogleFonts.exo(fontSize: 15, color: Colors.grey.shade700, height: 1.8),
          textAlign: TextAlign.justify,
        ),
      ],
    );
  }

  Widget _buildContactBox(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(_kSpacing * 3),
      decoration: BoxDecoration(
        color: _kPrimaryColor.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(_kBorderRadius),
        border: Border.all(color: _kPrimaryColor.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(Icons.contact_support, size: 50, color: _kPrimaryColor),
          const SizedBox(height: _kSpacing),
          Text(
            l10n?.termsQuestions ?? '¿Preguntas sobre nuestros términos?',
            style: GoogleFonts.exo(fontSize: 20, fontWeight: FontWeight.bold, color: _kTextColor),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: _kSpacing),
          Text(
            l10n?.termsContactUs ?? 'Contáctanos y estaremos encantados de ayudarte',
            style: GoogleFonts.exo(fontSize: 15, color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
