import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:google_fonts/google_fonts.dart';

class DriverSettingsScreen extends StatefulWidget {
  const DriverSettingsScreen({super.key});

  @override
  State<DriverSettingsScreen> createState() => _DriverSettingsScreenState();
}

class _DriverSettingsScreenState extends State<DriverSettingsScreen> {
  bool _notificationsEnabled = true;

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text('Configuración', style: GoogleFonts.exo(fontWeight: FontWeight.w600)),
        backgroundColor: CupertinoColors.systemBackground,
      ),
      child: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  Container(
                    decoration: BoxDecoration(
                      color: CupertinoColors.systemBackground,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        _buildSettingTile(
                          icon: CupertinoIcons.bell,
                          title: 'Notificaciones',
                          subtitle: 'Recibir notificaciones de viajes',
                          trailing: CupertinoSwitch(
                            value: _notificationsEnabled,
                            onChanged: (value) {
                              setState(() => _notificationsEnabled = value);
                            },
                          ),
                          isFirst: true,
                        ),
                        const Divider(height: 1, indent: 60),
                        _buildSettingTile(
                          icon: CupertinoIcons.person,
                          title: 'Editar Perfil',
                          subtitle: 'Modificar información personal',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Pantalla de perfil en desarrollo',
                                  style: GoogleFonts.exo(),
                                ),
                                backgroundColor: CupertinoColors.systemOrange,
                              ),
                            );
                          },
                        ),
                        const Divider(height: 1, indent: 60),
                        _buildSettingTile(
                          icon: CupertinoIcons.car,
                          title: 'Información del Vehículo',
                          subtitle: 'Gestionar datos del carro',
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Pantalla de vehículo en desarrollo',
                                  style: GoogleFonts.exo(),
                                ),
                                backgroundColor: CupertinoColors.systemOrange,
                              ),
                            );
                          },
                          isLast: true,
                        ),
                      ],
                    ),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? trailing,
    VoidCallback? onTap,
    bool isFirst = false,
    bool isLast = false,
  }) {
    return CupertinoButton(
      padding: EdgeInsets.zero,
      minimumSize: Size.zero,
      onPressed: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: CupertinoColors.systemBackground,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(isFirst ? 12 : 0),
            topRight: Radius.circular(isFirst ? 12 : 0),
            bottomLeft: Radius.circular(isLast ? 12 : 0),
            bottomRight: Radius.circular(isLast ? 12 : 0),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: CupertinoColors.activeBlue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: CupertinoColors.activeBlue, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.exo(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: CupertinoColors.label,
                      decoration: TextDecoration.none,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: GoogleFonts.exo(
                      fontSize: 14,
                      color: CupertinoColors.secondaryLabel,
                      decoration: TextDecoration.none,
                    ),
                  ),
                ],
              ),
            ),
            if (trailing != null) trailing,
            if (trailing == null && onTap != null)
              Icon(CupertinoIcons.chevron_right, color: CupertinoColors.tertiaryLabel, size: 18),
          ],
        ),
      ),
    );
  }
}
