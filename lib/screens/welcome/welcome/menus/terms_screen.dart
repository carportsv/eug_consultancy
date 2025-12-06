import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../../shared/widgets/whatsapp_floating_button.dart';
import '../../../../shared/widgets/welcome_footer.dart';
import '../../navbar/welcome_navbar.dart';
import '../../../../auth/login_screen.dart';
import '../welcome_screen.dart';
import 'company_screen.dart';
import 'servicios_screen.dart';
import 'profesionalidad.dart';
import 'destinations_screen.dart';
import 'contacts_screen.dart';
import 'tours_screen.dart';
import 'weddings_screen.dart';
import 'privacy_policy_screen.dart';

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
            // Footer
            WelcomeFooter(
              onNavigateToWelcome: _navigateToWelcomePath,
              onNavigateToDestination: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (context) => const DestinationsScreen()),
                );
              },
              onNavigateToCompany: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (context) => const CompanyScreen()),
                );
              },
              onNavigateToContacts: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (context) => const ContactsScreen()),
                );
              },
              onNavigateToServices: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (context) => const ServiciosScreen()),
                );
              },
              onNavigateToAbout: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (context) => const AcercaDeScreen()),
                );
              },
              onNavigateToTerms: null, // Ya estamos aquí
              onNavigateToPrivacy: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (context) => const PrivacyPolicyScreen()),
                );
              },
            ),
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
          // Introducción
          Text(
            l10n?.termsIntro ?? '',
            style: GoogleFonts.exo(fontSize: 16, color: Colors.grey.shade700, height: 1.8, fontWeight: FontWeight.w500),
            textAlign: TextAlign.justify,
          ),
          const SizedBox(height: _kSpacing * 4),
          
          // Sección 1: PREMESAS
          _buildSection(
            '1. ${l10n?.termsSection1Title ?? 'PREMISAS'}',
            l10n?.termsSection1_1 ?? '',
          ),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection1_2 ?? ''),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection1_3 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection1_3a ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection1_3b ?? ''),
          const SizedBox(height: _kSpacing * 3),
          
          // Sección 2: RESERVAS
          _buildSection(
            '2. ${l10n?.termsSection2Title ?? 'RESERVAS'}',
            l10n?.termsSection2_1 ?? '',
          ),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection2_2 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection2_2b ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection2_2c ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection2_2d ?? ''),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection2_3 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection2_3b ?? ''),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection2_4 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection2_5 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection2_6 ?? ''),
          const SizedBox(height: _kSpacing * 3),
          
          // Sección 3: RECESO Y PENALIDADES
          _buildSection(
            '3. ${l10n?.termsSection3Title ?? 'RECESO Y PENALIDADES'}',
            l10n?.termsSection3_1 ?? '',
          ),
          const SizedBox(height: _kSpacing * 3),
          
          // Sección 4: LEY APLICABLE
          _buildSection(
            '4. ${l10n?.termsSection4Title ?? 'LEY APLICABLE – JURISDICCIÓN'}',
            l10n?.termsSection4_1 ?? '',
          ),
          const SizedBox(height: _kSpacing * 3),
          
          // Sección 5: EQUIPAJE
          _buildSection(
            '5. ${l10n?.termsSection5Title ?? 'EQUIPAJE'}',
            l10n?.termsSection5_1 ?? '',
          ),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection5_1b ?? ''),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection5_2 ?? ''),
          const SizedBox(height: _kSpacing * 3),
          
          // Sección 6: RETRASOS
          _buildSection(
            '6. ${l10n?.termsSection6Title ?? 'RETRASOS'}',
            l10n?.termsSection6_1 ?? '',
          ),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection6_2 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection6_2b ?? ''),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection6_3 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection6_3b ?? ''),
          const SizedBox(height: _kSpacing * 3),
          
          // Sección 7: MODALIDADES DEL TRANSPORTE
          _buildSection(
            '7. ${l10n?.termsSection7Title ?? 'MODALIDADES DEL TRANSPORTE'}',
            l10n?.termsSection7_1 ?? '',
          ),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection7_2 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection7_3 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection7_4 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection7_5 ?? ''),
          const SizedBox(height: _kSpacing * 3),
          
          // Sección 8: CANCELACIONES
          _buildSection(
            '8. ${l10n?.termsSection8Title ?? 'CANCELACIONES, MODIFICACIONES, REEMBOLSOS'}',
            l10n?.termsSection8_1 ?? '',
          ),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection8_1b ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection8_1c ?? ''),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection8_2 ?? ''),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection8_3 ?? ''),
          const SizedBox(height: _kSpacing * 3),
          
          // Sección 9: IDIOMA
          _buildSection(
            '9. ${l10n?.termsSection9Title ?? 'IDIOMA'}',
            l10n?.termsSection9_1 ?? '',
          ),
          const SizedBox(height: _kSpacing * 3),
          
          // Sección 10: PRIVACIDAD
          _buildSection(
            '10. ${l10n?.termsSection10Title ?? 'INFORMATIVA PARA LA PRIVACIDAD'}',
            l10n?.termsSection10_1 ?? '',
          ),
          const SizedBox(height: _kSpacing * 2),
          _buildSubSection(l10n?.termsSection10_2 ?? ''),
          const SizedBox(height: _kSpacing),
          _buildSubSection(l10n?.termsSection10_3 ?? ''),
          const SizedBox(height: _kSpacing * 4),
          
          // APROBACIÓN ESPECÍFICA DE CLÁUSULAS
          _buildSection(
            l10n?.termsSpecificApprovalTitle ?? 'APROBACIÓN ESPECÍFICA DE CLÁUSULAS',
            l10n?.termsSpecificApproval ?? '',
          ),
          const SizedBox(height: _kSpacing * 2),
          _buildBullet(l10n?.termsClause1 ?? ''),
          _buildBullet(l10n?.termsClause2 ?? ''),
          _buildBullet(l10n?.termsClause3 ?? ''),
          _buildBullet(l10n?.termsClause4 ?? ''),
          _buildBullet(l10n?.termsClause5 ?? ''),
          _buildBullet(l10n?.termsClause6 ?? ''),
          _buildBullet(l10n?.termsClause7 ?? ''),
          const SizedBox(height: _kSpacing * 4),
          
          _buildContactBox(context),
        ],
      ),
    );
  }

  Widget _buildSubSection(String content) {
    if (content.isEmpty) return const SizedBox.shrink();
    return Text(
      content,
      style: GoogleFonts.exo(fontSize: 15, color: Colors.grey.shade700, height: 1.8),
      textAlign: TextAlign.justify,
    );
  }

  Widget _buildBullet(String content) {
    if (content.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(left: 20, bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: GoogleFonts.exo(fontSize: 15, color: Colors.grey.shade700)),
          Expanded(
            child: Text(
              content,
              style: GoogleFonts.exo(fontSize: 15, color: Colors.grey.shade700, height: 1.6),
            ),
          ),
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
