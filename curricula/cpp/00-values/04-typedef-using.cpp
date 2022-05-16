#include <cstdint>

int main()
{
    // We've determined that we need greater precision in our program.
    // TODO: modify this typedef to address the new specs.
    typedef float number_t;

    number_t x = 69.69;
    number_t y = 420.420;
    number_t z = x * y;

    // Another way to write this is via `using`
    using number_t = float;
}
