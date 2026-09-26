require 'xcodeproj'

# Regenerate this test target after Expo prebuild; never version generated ios/.
project_path = 'ios/MoaFiles.xcodeproj'
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'MoaFiles' }
raise 'Missing generated app target' unless app
tests = project.new_target(:ui_test_bundle, 'MoaFilesUITests', :ios, '16.4')
tests.add_dependency(app)
source = project.main_group.new_file('../tests/ios/MoaFilesUITests.swift')
tests.source_build_phase.add_file_reference(source)
tests.build_configurations.each do |config|
  config.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'app.ninetosix.moafiles.uitests',
    'TEST_TARGET_NAME' => 'MoaFiles',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'CODE_SIGNING_ALLOWED' => 'NO',
    'TARGETED_DEVICE_FAMILY' => '1,2'
  })
end
project.root_object.attributes['TargetAttributes'] ||= {}
project.root_object.attributes['TargetAttributes'][tests.uuid] = { 'TestTargetID' => app.uuid }
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_build_target(tests)
scheme.add_test_target(tests)
scheme.set_launch_target(app)
scheme.save_as(project_path, 'MoaFilesUITests', true)
