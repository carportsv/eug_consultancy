import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../l10n/app_localizations.dart';
import '../../navbar/welcome_navbar.dart';
import '../../../../auth/login_screen.dart';
import '../welcome_screen.dart';
import 'package:firebase_auth/firebase_auth.dart';

// Constants
const _kTextColor = Color(0xFF1A202C);
const _kSpacing = 16.0;
const _kFeatureOrange = Color(0xFFFFA07A); // Naranja claro similar a la imagen

/// Pantalla de características del servicio
class FeaturesScreen extends StatelessWidget {
  const FeaturesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 900;
    final currentUser = FirebaseAuth.instance.currentUser;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: WelcomeNavbar(
        currentUser: currentUser,
        onNavigateToLogin: () {
          Navigator.of(context).push(MaterialPageRoute(builder: (context) => const LoginScreen()));
        },
        onNavigateToProfile: () {
          // Navegar a perfil si está autenticado
        },
        onHandleLogout: () async {
          final navigator = Navigator.of(context);
          await FirebaseAuth.instance.signOut();
          if (context.mounted) {
            navigator.pushAndRemoveUntil(
              MaterialPageRoute(builder: (context) => const WelcomeScreen()),
              (route) => false,
            );
          }
        },
        onNavigateToWelcomePath: () {
          Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (context) => const WelcomeScreen()));
        },
        onNavigateToCompany: () {
          // Navegar a empresa si es necesario
        },
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: isTablet ? 48.0 : 24.0,
            vertical: isTablet ? 64.0 : 32.0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Título principal
              Builder(
                builder: (context) {
                  final l10n = AppLocalizations.of(context);
                  return Center(
                    child: Text(
                      l10n?.featuresTitle ?? 'Nuestros Servicios',
                      style: GoogleFonts.exo(
                        fontSize: isTablet ? 48 : 36,
                        fontWeight: FontWeight.bold,
                        color: _kTextColor,
                        height: 1.2,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  );
                },
              ),
              const SizedBox(height: _kSpacing * 2),

              // Subtítulo
              Center(
                child: Text(
                  'Descubre por qué somos tu mejor opción para viajar',
                  style: GoogleFonts.exo(
                    fontSize: isTablet ? 18 : 16,
                    color: Colors.grey.shade700,
                    height: 1.6,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: _kSpacing * 4),

              // Grid de características
              isTablet ? _buildWideLayout(context) : _buildNarrowLayout(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWideLayout(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: _buildFeatureCard(context, 1, 'Viaje', _getFeature1Text(context))),
        const SizedBox(width: _kSpacing * 2),
        Expanded(child: _buildFeatureCard(context, 2, 'Experiencia', _getFeature2Text(context))),
        const SizedBox(width: _kSpacing * 2),
        Expanded(child: _buildFeatureCard(context, 3, 'Relax', _getFeature3Text(context))),
      ],
    );
  }

  Widget _buildNarrowLayout(BuildContext context) {
    return Column(
      children: [
        _buildFeatureCard(context, 1, 'Viaje', _getFeature1Text(context)),
        const SizedBox(height: _kSpacing * 3),
        _buildFeatureCard(context, 2, 'Experiencia', _getFeature2Text(context)),
        const SizedBox(height: _kSpacing * 3),
        _buildFeatureCard(context, 3, 'Relax', _getFeature3Text(context)),
      ],
    );
  }

  Widget _buildFeatureCard(BuildContext context, int number, String title, String description) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Número grande en naranja
        Text(
          number.toString().padLeft(2, '0'),
          style: GoogleFonts.exo(
            fontSize: 72,
            fontWeight: FontWeight.w300,
            color: _kFeatureOrange,
            height: 1.0,
          ),
        ),
        const SizedBox(height: _kSpacing),
        // Título
        Text(
          title,
          style: GoogleFonts.exo(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: _kTextColor,
            height: 1.2,
          ),
        ),
        const SizedBox(height: _kSpacing * 1.5),
        // Descripción
        Text(
          description,
          style: GoogleFonts.exo(
            fontSize: 16,
            color: Colors.grey.shade600,
            height: 1.6,
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }

  String _getFeature1Text(BuildContext context) {
    return 'Un viaje con nuestro servicio es mucho más que un simple desplazamiento, es una experiencia llena de comodidad y atención personalizada. Cada destino se convierte en un viaje de relajación y descubrimiento único.';
  }

  String _getFeature2Text(BuildContext context) {
    return 'Descubre un mundo en el que cada viaje se transforma en una oportunidad de conexión. Vivirás momentos irrepetibles, disfrutando de un servicio impecable, destinos extraordinarios y una atención que cuida cada detalle.';
  }

  String _getFeature3Text(BuildContext context) {
    return 'Cada viaje es una escapada creada para renovar cuerpo y alma. Disfruta de destinos exclusivos, servicios de alta gama y una atención especial pensada para hacerte vivir el relax total que mereces.';
  }
}
