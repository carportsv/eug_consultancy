/// Datos de los vehículos disponibles
/// Extraído de welcome_screen.dart
class VehicleData {
  static List<Map<String, dynamic>> get vehicles => [
    {
      'key': 'sedan',
      'image': 'images/cars/sedan.jpg',
      'passengers': 3,
      'luggage': 1,
      'descriptionKey': 'sedanDesc',
    },
    {
      'key': 'economy',
      'image': 'images/cars/economica.jpg',
      'passengers': 3,
      'luggage': 1,
      'descriptionKey': 'economyDesc',
    },
    {
      'key': 'suv',
      'image': 'images/cars/suv.jpg',
      'passengers': 6,
      'luggage': 2,
      'descriptionKey': 'suvDesc',
    },
    {
      'key': 'van',
      'image': 'images/cars/van.jpg',
      'passengers': 8,
      'luggage': 4,
      'descriptionKey': 'vanDesc',
    },
    {
      'key': 'luxury',
      'image': 'images/cars/luxury.jpg',
      'passengers': 3,
      'luggage': 2,
      'descriptionKey': 'luxuryDesc',
    },
  ];
}
