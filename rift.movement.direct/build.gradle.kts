
val engineVersion: String by rootProject.extra

dependencies {
    implementation("co.playrift:engine:$engineVersion")
    implementation("co.playrift:net-common:$engineVersion")
    implementation("co.playrift:cfg:$engineVersion")
    implementation("co.playrift:rift-project:$engineVersion")
    implementation(project(":actions-queue"))
    testImplementation(project(":actions-movement"))
    testImplementation(project(":movement-pathfinding"))
    testImplementation(project(":movement-pathfinding-bfs"))
    testRuntimeOnly(project(":skills"))
}
